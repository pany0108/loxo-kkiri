package com.kairos.superscheduler;

import android.os.Bundle; // 추가
import android.util.Log; // 추가
import android.content.pm.PackageInfo; // 추가
import android.content.pm.PackageManager; // 추가
import android.content.pm.Signature; // 추가
import java.security.MessageDigest; // 추가
import java.security.NoSuchAlgorithmException; // 추가
import android.util.Base64; // 추가
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getAppKeyHash(); // 앱 켜질 때 지문 로그 출력 실행
    }

    private void getAppKeyHash() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), PackageManager.GET_SIGNATURES);
            for (Signature signature : info.signatures) {
                MessageDigest md;
                md = MessageDigest.getInstance("SHA");
                md.update(signature.toByteArray());
                // SHA-1 값을 16진수 문자열로 변환 (우리가 아는 그 형식)
                StringBuilder sb = new StringBuilder();
                for (byte b : md.digest()) {
                    sb.append(String.format("%02X:", b));
                }
                if (sb.length() > 0) {
                    sb.setLength(sb.length() - 1); // 마지막 콜론 제거
                }
                // ★★★ 여기에 범인이 찍힙니다! ★★★
                Log.e("MY_REAL_SHA1", "내 진짜 SHA-1 지문: " + sb.toString());
            }
        } catch (Exception e) {
            Log.e("name not found", e.toString());
        }
    }
}