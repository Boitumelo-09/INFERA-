package com.application.infera.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

@Service
public class RecaptchaService {

    private static final String VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    private final RestClient restClient = RestClient.create();

    @Value("${recaptcha.secret-key}")
    private String secretKey;

    @Value("${recaptcha.min-score:0.5}")
    private double minScore;

    /** Fails closed: any missing token, network error, wrong action or low score returns false. */
    public boolean verify(String token, String expectedAction, String remoteIp) {
        if (token == null || token.isBlank()) return false;

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", secretKey);
        form.add("response", token);
        if (remoteIp != null) form.add("remoteip", remoteIp);

        try {
            Map<?, ?> res = restClient.post()
                    .uri(VERIFY_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);

            if (res == null || !Boolean.TRUE.equals(res.get("success"))) return false;
            if (!expectedAction.equals(res.get("action"))) return false;
            return res.get("score") instanceof Number n && n.doubleValue() >= minScore;
        } catch (RestClientException e) {
            return false;
        }
    }
}