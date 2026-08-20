package com.application.infera.controllers;

import com.application.infera.enums.Role;
import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import com.application.infera.security.CustomUserDetails;
import com.application.infera.services.MailService;
import com.application.infera.services.OtpService;
import com.application.infera.dtos.requests.EmailRequest;
import com.application.infera.dtos.requests.VerifyCodeRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Controller
@RequestMapping("/auth")
public class AuthController {

    private final OtpService otpService;
    private final MailService mailService;
    private final UserRepository userRepository;

    public AuthController(OtpService otpService, MailService mailService, UserRepository userRepository) {
        this.otpService = otpService;
        this.mailService = mailService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public String authPage(Model model) {
        model.addAttribute("pageTitle", "Sign in — INCAPTUR");
        return "auth";
    }

    @PostMapping("/request-code")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> requestCode(@Valid @RequestBody EmailRequest request) {
        Map<String, Object> body = new HashMap<>();

        OtpService.RequestOutcome outcome = otpService.requestCode(request.getEmail());

        if (outcome.status() == OtpService.RequestStatus.COOLDOWN) {
            body.put("status", "cooldown");
            body.put("message", "A code was already sent. Please wait before requesting another.");
            return ResponseEntity.status(429).body(body);
        }

        mailService.sendOtpEmail(request.getEmail(), outcome.code());

        body.put("status", "sent");
        body.put("message", "Code sent to " + request.getEmail());
        return ResponseEntity.ok(body);
    }

    @PostMapping("/verify-code")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> verifyCode(@Valid @RequestBody VerifyCodeRequest request,
                                                          HttpServletRequest httpRequest,
                                                          HttpServletResponse httpResponse) {
        Map<String, Object> body = new HashMap<>();
        OtpService.VerifyResult result = otpService.verifyCode(request.getEmail(), request.getCode());

        switch (result) {
            case SUCCESS -> {
                User user = userRepository.findByEmail(request.getEmail())
                        .orElseGet(() -> createUser(request.getEmail()));

                loginUser(user, httpRequest, httpResponse);

                body.put("status", "success");
                body.put("redirect", "/dashboard");
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

        new HttpSessionSecurityContextRepository().saveContext(context, request, response);
    }
}