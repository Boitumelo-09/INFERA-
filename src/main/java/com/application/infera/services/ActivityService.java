package com.application.infera.services;

import com.application.infera.enums.ActivityType;
import com.application.infera.models.*;
import com.application.infera.repositories.ActivityRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;

    public ActivityService(ActivityRepository activityRepository) {
        this.activityRepository = activityRepository;
    }

    public void log(User user, ActivityType type, String targetName, Workspace workspace) {
        Activity activity = new Activity();
        activity.setUser(user);
        activity.setType(type);
        activity.setTargetName(targetName);
        activity.setWorkspace(workspace);
        activityRepository.save(activity);
    }

    public List<Activity> getRecentActivities(User user, int limit) {
        return activityRepository.findByUserOrderByCreatedAtDesc(user)
                .stream().limit(limit).toList();
    }

    private List<Activity> getThisWeekActivities(User user) {
        return activityRepository.findByUserAndCreatedAtAfterOrderByCreatedAtAsc(
                user, LocalDateTime.now().minusDays(7));
    }

    public long countWeeklyByPrefix(User user, String prefix) {
        return getThisWeekActivities(user).stream()
                .filter(a -> a.getType().name().startsWith(prefix))
                .count();
    }

    // Mon..Sun counts for the dashboard bar chart
    public java.util.List<Integer> getWeeklyDailyCounts(User user) {
        Integer[] counts = new Integer[7];
        java.util.Arrays.fill(counts, 0);
        for (Activity a : getThisWeekActivities(user)) {
            int dayIdx = a.getCreatedAt().getDayOfWeek().getValue() - 1; // Mon=0..Sun=6
            counts[dayIdx]++;
        }
        return java.util.Arrays.asList(counts);
    }
}