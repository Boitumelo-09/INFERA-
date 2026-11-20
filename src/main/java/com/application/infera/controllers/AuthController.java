package com.application.infera.controllers;

import com.application.infera.dtos.modalviews.InviteModalView;
import com.application.infera.enums.Role;
import com.application.infera.models.Invitation;
import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import com.application.infera.security.CustomUserDetails;
import com.application.infera.services.*;
import com.application.infera.dtos.requests.EmailRequest;
import com.application.infera.dtos.requests.VerifyCodeRequest;
import jakarta.mail.MessagingException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Controller
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final OtpService otpService;
    private final MailService mailService;
    private final UserRepository userRepository;
    private final RecaptchaService recaptchaService;
    private final GoogleIdTokenService googleIdTokenService;
    private final AuthFlowService authFlowService;
    private final InvitationService invitationService;

    private static final String ONE_TAP_NONCES = "oneTapNonces";
    private static final int MAX_ONE_TAP_NONCES = 5;

    public record OneTapRequest(@NotBlank String credential) {}

    @Value("${recaptcha.site-key}")
    private String recaptchaSiteKey;

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;


    @GetMapping
    public String authPage(Model model, HttpSession session) {
        model.addAttribute("pageTitle", "authenticate | incaptur");
        model.addAttribute("recaptchaSiteKey", recaptchaSiteKey);

        // "invalid" arrives as a flash attribute; otherwise rebuild the sign-in modal from the stored invitation path
        if (!model.containsAttribute("inviteModal")) {
            InviteModalView pending = pendingInvitationModal(session);
            if (pending != null) model.addAttribute("inviteModal", pending);
        }

        String nonce = UUID.randomUUID().toString();
        @SuppressWarnings("unchecked")
        List<String> nonces = (List<String>) session.getAttribute(ONE_TAP_NONCES);
        if (nonces == null) {
            nonces = Collections.synchronizedList(new ArrayList<>());
            session.setAttribute(ONE_TAP_NONCES, nonces);
        }
        synchronized (nonces) {
            nonces.add(nonce);
            while (nonces.size() > MAX_ONE_TAP_NONCES) nonces.remove(0);
        }
        model.addAttribute("oneTapNonce", nonce);
        model.addAttribute("googleClientId", googleClientId);
        return "auth";
    }

    @PostMapping("/request-code")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> requestCode(@Valid @RequestBody EmailRequest request,
                                                           @RequestHeader(value = "X-Recaptcha-Token", required = false) String recaptchaToken,
                                                           HttpServletRequest httpRequest) throws MessagingException {
        Map<String, Object> body = new HashMap<>();

        if (!recaptchaService.verify(recaptchaToken, "request_otp", httpRequest.getRemoteAddr())) {
            body.put("status", "captcha_failed");
            body.put("message", "We couldn't verify you're human. Please refresh and try again.");
            return ResponseEntity.status(400).body(body);
        }
        String email = request.getEmail().trim().toLowerCase();

        OtpService.RequestOutcome outcome = otpService.requestCode(email);

        if (outcome.status() == OtpService.RequestStatus.COOLDOWN) {
            body.put("status", "cooldown");
            body.put("message", "A code was already sent. Please wait before requesting another.");
            return ResponseEntity.status(429).body(body);
        }

        mailService.sendOtpEmail(email, outcome.code());

        body.put("status", "sent");
        body.put("message", "Code sent to " + email);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/verify-code")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> verifyCode(@Valid @RequestBody VerifyCodeRequest request,
                                                          HttpServletRequest httpRequest,
                                                          HttpServletResponse httpResponse) {
        Map<String, Object> body = new HashMap<>();
        String email = request.getEmail().trim().toLowerCase();
        OtpService.VerifyResult result = otpService.verifyCode(email, request.getCode());

        switch (result) {
            case SUCCESS -> {
                User user = userRepository.findByEmail(email)
                        .orElseGet(() -> createUser(email));

                loginUser(user, httpRequest, httpResponse);

                body.put("status", "success");
                body.put("redirect", authFlowService.postLoginTarget(httpRequest));
                return ResponseEntity.ok(body);
            }
            case EXPIRED -> {
                body.put("status", "expired");
                body.put("message", "This code has expired. Request a new one.");
                return ResponseEntity.status(400).body(body);
            }
            case LOCKED -> {
                body.put("status", "locked");
                body.put("message", "Too many attempts. Request a new code.");
                return ResponseEntity.status(429).body(body);
            }
            case NOT_FOUND -> {
                body.put("status", "not_found");
                body.put("message", "No active code for this email. Request a new one.");
                return ResponseEntity.status(400).body(body);
            }
            default -> {
                body.put("status", "invalid");
                body.put("message", "Incorrect code.");
                return ResponseEntity.status(400).body(body);
            }
        }
    }

    @PostMapping("/google-one-tap")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> googleOneTap(@Valid @RequestBody OneTapRequest request,
                                                            HttpServletRequest httpRequest,
                                                            HttpServletResponse httpResponse) {
        Map<String, Object> body = new HashMap<>();

        HttpSession session = httpRequest.getSession(false);
        @SuppressWarnings("unchecked")
        List<String> nonces = session == null ? null : (List<String>) session.getAttribute(ONE_TAP_NONCES);

        Optional<GoogleIdTokenService.GoogleIdentity> identity =
                googleIdTokenService.verify(request.credential(), nonces);

        if (identity.isEmpty()) {
            body.put("status", "invalid_token");
            body.put("message", "We couldn't verify your Google sign-in. Please try again.");
            return ResponseEntity.status(401).body(body);
        }

        GoogleIdTokenService.GoogleIdentity g = identity.get();
        synchronized (nonces) { nonces.remove(g.nonce()); }   // single-use: a replay of this token now fails
        User user = authFlowService.provisionUser(g.email(), g.firstName(), g.lastName(), g.picture());
        loginUser(user, httpRequest, httpResponse);

        body.put("status", "success");
        body.put("redirect", authFlowService.postLoginTarget(httpRequest));
        return ResponseEntity.ok(body);
    }

    // Only a path matching /invitations/<43-char token> is ever read back from the session.
    private InviteModalView pendingInvitationModal(HttpSession session) {
        Object stored = session.getAttribute(InvitationTokens.RETURN_PATH_SESSION_KEY);
        if (!(stored instanceof String path) || !InvitationTokens.RETURN_PATH.matcher(path).matches()) return null;
        String token = path.substring("/invitations/".length());
        Optional<Invitation> found = invitationService.previewByToken(token);
        if (found.isEmpty()) {                       // expired / revoked / used since: drop the stale path
            session.removeAttribute(InvitationTokens.RETURN_PATH_SESSION_KEY);
            return null;
        }
        return InviteModalView.signIn(found.get());
    }

    private User createUser(String email) {
        User user = new User();
        user.setEmail(email);
        user.setFirstName("User");
        user.setLastName("Account");
        user.setRole(Role.USER);
        user.setEnabled(true);
        return userRepository.save(user);
    }

    private void loginUser(User user, HttpServletRequest request, HttpServletResponse response) {
        CustomUserDetails userDetails = new CustomUserDetails(user);
        UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authToken);
        SecurityContextHolder.setContext(context);

        // Rotate the session id on login (session-fixation protection). Attributes, including a
        // pending invitation path, are carried over. Skipped if there is no session yet.
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }

        new HttpSessionSecurityContextRepository().saveContext(context, request, response);
    }
}