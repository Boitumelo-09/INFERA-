package com.application.infera.services;

import com.application.infera.dtos.requests.SignUpRequest;
import com.application.infera.enums.Role;
import com.application.infera.exception.UserExistsByEmailException;
import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;


@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;


    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }
    public void registerUserToDatabase(@Valid SignUpRequest signUpRequest) {
        User user = new User();
        user.setFirstName(signUpRequest.getFirstName());
        user.setLastName(signUpRequest.getLastName());
        user.setEmail(signUpRequest.getEmail());

        user.setPassword(passwordEncoder.encode(signUpRequest.getPassword()));
        user.setRole(Role.USER);
        if(userRepository.existsByEmail(user.getEmail())){
            throw new UserExistsByEmailException("Email already exists");
        }
        userRepository.save(user);
    }
}
