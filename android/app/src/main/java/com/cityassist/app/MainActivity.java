package com.cityassist.app;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.media.ToneGenerator;
import android.media.AudioManager;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private TextToSpeech tts;
    private ToneGenerator toneGen;

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
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            
            // Expose native Android TTS bridge directly to Javascript window.AndroidVoiceBridge
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
