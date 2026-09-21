package com.deepseek.dshpocket;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {

    private WebView webView;
    private String cachedCss = "";
    private String cachedJs = "";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = this.getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            // Load injection assets
            loadAssets();

            // Intercept and inject DeepSeek theme on page load
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    if (url != null && !url.contains("localhost")) {
                        injectDeepSeekTheme(view);
                    }
                }
            });

            // Grant camera / microphone permissions automatically for scanner & audio
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    MainActivity.this.runOnUiThread(() -> request.grant(request.getResources()));
                }
            });
        }
    }

    private void loadAssets() {
        try {
            InputStream isCss = getAssets().open("public/src/injector/deepseek-theme.css");
            byte[] bufferCss = new byte[isCss.available()];
            isCss.read(bufferCss);
            isCss.close();
            cachedCss = new String(bufferCss, StandardCharsets.UTF_8);

            InputStream isJs = getAssets().open("public/src/injector/deepseek-injector.js");
            byte[] bufferJs = new byte[isJs.available()];
            isJs.read(bufferJs);
            isJs.close();
            cachedJs = new String(bufferJs, StandardCharsets.UTF_8);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void injectDeepSeekTheme(WebView view) {
        try {
            String cssBase64 = Base64.encodeToString(cachedCss.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
            String jsBase64 = Base64.encodeToString(cachedJs.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);

            String injectionScript =
                "(function() {" +
                "  try {" +
                "    if (!document.getElementById('deepseek-native-style')) {" +
                "      var style = document.createElement('style');" +
                "      style.id = 'deepseek-native-style';" +
                "      style.textContent = decodeURIComponent(escape(window.atob('" + cssBase64 + "')));" +
                "      document.head.appendChild(style);" +
                "    }" +
                "    if (!window.__deepseek_injected) {" +
                "      window.__deepseek_injected = true;" +
                "      var script = document.createElement('script');" +
                "      script.textContent = decodeURIComponent(escape(window.atob('" + jsBase64 + "')));" +
                "      document.body.appendChild(script);" +
                "    }" +
                "    if (!document.getElementById('ds-native-floating-hub')) {" +
                "      var floatBtn = document.createElement('div');" +
                "      floatBtn.id = 'ds-native-floating-hub';" +
                "      floatBtn.innerHTML = '⚙️';" +
                "      floatBtn.style.cssText = 'position:fixed;bottom:80px;right:16px;width:44px;height:44px;background:#4D6BFE;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(77,107,254,0.4);z-index:999999;cursor:pointer;font-size:20px;user-select:none;';" +
                "      var menu = document.createElement('div');" +
                "      menu.id = 'ds-native-floating-menu';" +
                "      menu.style.cssText = 'display:none;position:fixed;bottom:134px;right:16px;background:#fff;border:1px solid #E5E6EB;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:8px;z-index:1000000;min-width:140px;font-size:13px;';" +
                "      menu.innerHTML = '<div style=\"padding:8px 12px;cursor:pointer;color:#1D2129;border-bottom:1px solid #F2F3F5;\" onclick=\"location.reload()\">🔄 刷新页面</div>' +" +
                "                       '<div style=\"padding:8px 12px;cursor:pointer;color:#F53F3F;\" onclick=\"location.href=\\'https://localhost/\\'\">🏠 返回连接中心</div>';" +
                "      floatBtn.onclick = function() {" +
                "        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';" +
                "      };" +
                "      document.body.appendChild(floatBtn);" +
                "      document.body.appendChild(menu);" +
                "    }" +
                "  } catch(e) { console.error('Theme inject failed', e); }" +
                "})();";

            view.evaluateJavascript(injectionScript, null);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            String currentUrl = webView.getUrl();
            if (currentUrl != null && !currentUrl.contains("localhost")) {
                webView.loadUrl("https://localhost/");
                return;
            }
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
