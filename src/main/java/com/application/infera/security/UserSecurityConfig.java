package com.application.infera.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.LogoutConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class UserSecurityConfig {
    private final OAuth2AuthenticationSuccessHandler o;
    public UserSecurityConfig(OAuth2AuthenticationSuccessHandler o) {
        this.o = o;
    }
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/home",
                                "/signup",
                                "/signin",
                                "/cssStyles/**",
                                "/javaScript/**",
                                "/app_resources/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .formLogin(form -> form
                        .loginPage("/signin")
                        .permitAll()
                ).oauth2Login(oauth2 -> oauth2.loginPage("/signin").successHandler(o))
                .logout(LogoutConfigurer::permitAll);

        return http.build();
    }

    @Bean
   public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}