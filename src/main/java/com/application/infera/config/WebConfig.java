package com.application.infera.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final SidebarModelInterceptor sidebarModelInterceptor;



    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(sidebarModelInterceptor)
                .excludePathPatterns("/cssStyles/**", "/javaScript/**", "/favicons/**",
                        "/app_resources/**", "/uploads/**", "/api/**",
                        "/workspaces/*/members/panel");   // modal fragment: no sidebar, so no extra queries
    }

    @Value("${app.upload-dir:uploads/avatars}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/avatars/**")
                .addResourceLocations("file:" + uploadDir + "/");
    }
}