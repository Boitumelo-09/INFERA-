package com.application.infera.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class UserSecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/signup", "/signin", "/home", "/static/cssStyles/**", "/static/javaScript/**", "/static/resources/**")
                        .permitAll()
                        .anyRequest()
                        .authenticated()
                )


                .formLogin(login -> login
                        .loginPage("/signin")
                        .loginProcessingUrl("/signin")
                        .defaultSuccessUrl("/dashboard", true)
                        .failureUrl("/signin?error")
                        .permitAll()
                )


                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/signin?logout")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID")
                        .permitAll()
                )
                .sessionManagement(session -> session
                        .maximumSessions(1)
                );

        return http.build();
    }


    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}