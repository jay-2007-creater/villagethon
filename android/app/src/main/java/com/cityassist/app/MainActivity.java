package com.cityassist.app;

import android.content.Intent;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.media.ToneGenerator;
import android.media.AudioManager;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private static final int RC_GOOGLE_SIGN_IN = 9001;
    private TextToSpeech tts;
    private ToneGenerator toneGen;
    private GoogleSignInClient mGoogleSignInClient;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            toneGen = new ToneGenerator(AudioManager.STREAM_MUSIC, 100);
        } catch (Exception ignored) {}

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS && tts != null) {
                tts.setLanguage(Locale.US);
            }
        });

        // Configure Google Sign-In options
        try {
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .build();
            mGoogleSignInClient = GoogleSignIn.getClient(this, gso);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            
            // 1. Android Voice & Chime Bridge
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void speak(String text, String lang) {
                    if (tts != null && text != null && !text.isEmpty()) {
                        runOnUiThread(() -> {
                            try {
                                if ("hi".equalsIgnoreCase(lang)) {
                                    tts.setLanguage(new Locale("hi", "IN"));
                                } else if ("mr".equalsIgnoreCase(lang)) {
                                    tts.setLanguage(new Locale("mr", "IN"));
                                } else {
                                    tts.setLanguage(Locale.US);
                                }
                                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "cityassist_voice_alert");
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        });
                    }
                }

                @JavascriptInterface
                public void playChime() {
                    try {
                        if (toneGen != null) {
                            toneGen.startTone(ToneGenerator.TONE_PROP_BEEP, 350);
                        }
                    } catch (Exception ignored) {}
                }
            }, "AndroidVoiceBridge");

            // 2. Real Native Google Sign-In Bridge
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void signIn() {
                    runOnUiThread(() -> {
                        try {
                            if (mGoogleSignInClient != null) {
                                mGoogleSignInClient.signOut().addOnCompleteListener(task -> {
                                    Intent signInIntent = mGoogleSignInClient.getSignInIntent();
                                    startActivityForResult(signInIntent, RC_GOOGLE_SIGN_IN);
                                });
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    });
                }
            }, "AndroidGoogleAuthBridge");
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == RC_GOOGLE_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                if (account != null) {
                    String name = account.getDisplayName() != null ? account.getDisplayName() : "";
                    String email = account.getEmail() != null ? account.getEmail() : "";
                    String photo = account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "";
                    String id = account.getId() != null ? account.getId() : "";
                    
                    runOnUiThread(() -> {
                        if (getBridge() != null && getBridge().getWebView() != null) {
                            String js = String.format(
                                "if (typeof AuthEngine !== 'undefined') { AuthEngine.handleNativeGoogleUserLogin('%s', '%s', '%s', '%s'); }",
                                name.replace("'", "\\'"), email.replace("'", "\\'"), photo.replace("'", "\\'"), id.replace("'", "\\'")
                            );
                            getBridge().getWebView().evaluateJavascript(js, null);
                        }
                    });
                }
            } catch (ApiException e) {
                e.printStackTrace();
                runOnUiThread(() -> {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(
                            "if (typeof CityAssist !== 'undefined') { CityAssist.showToast('Google Sign-In canceled or failed'); }",
                            null
                        );
                    }
                });
            }
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (toneGen != null) {
            toneGen.release();
        }
        super.onDestroy();
    }
}
