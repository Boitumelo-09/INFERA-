package com.application.infera.services;

import com.application.infera.dtos.requests.SignUpRequest;
import com.application.infera.enums.Role;
import com.application.infera.exception.PasswordsDontMatchException;
import com.application.infera.exception.UserExistsByEmailException;
import com.application.infera.exception.UserNameOrLastNameCantBeNullException;
import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;


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

        if (signUpRequest.getFirstName().isBlank() || signUpRequest.getLastName().isBlank()){
            throw new UserNameOrLastNameCantBeNullException("Required!");
        }
        user.setFirstName(signUpRequest.getFirstName());
        user.setLastName(signUpRequest.getLastName());

        user.setEmail(signUpRequest.getEmail());
        if(!signUpRequest.getPassword().equals(signUpRequest.getConfirmPassword())){
           throw new PasswordsDontMatchException("Passwords Don't Match!");
        }
        user.setPassword(passwordEncoder.encode(signUpRequest.getPassword()));
        user.setRole(Role.USER);

        if(userRepository.existsByEmail(user.getEmail())){
            throw new UserExistsByEmailException("Email already exists!");
        }

        userRepository.save(user);
    }
    public Long countAllUsers(){
        return userRepository.count();
    }
}
