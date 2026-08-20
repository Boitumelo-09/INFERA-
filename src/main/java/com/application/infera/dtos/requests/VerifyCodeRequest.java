package com.application.infera.dtos.requests;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyCodeRequest {
    @NotBlank
    private String email;

    @NotBlank
    private String code;
}