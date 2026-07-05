package com.application.infera.dtos.responses;


import lombok.Data;

@Data
public class SignInResponse {
    private String firstName;
    private String lastName;
    private String email;
    private String role;
}
