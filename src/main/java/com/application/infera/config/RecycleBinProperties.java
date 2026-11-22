package com.application.infera.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/* The single source of truth for how long the bin keeps things.
   Used by the restore gates now, and by the bin panels and the purge job later. */
@Component
@ConfigurationProperties(prefix = "app.recycle-bin")
@Getter
@Setter
public class RecycleBinProperties {

    private int retentionDays = 5;

    // Max items purged per type per run; anything beyond that waits for the next run
    private int purgeBatchSize = 200;

    // Anything deleted at or before this moment is expired: hidden from the bin, not restorable, due for purge
    public LocalDateTime cutoff() {
        return LocalDateTime.now().minusDays(retentionDays);
    }
}