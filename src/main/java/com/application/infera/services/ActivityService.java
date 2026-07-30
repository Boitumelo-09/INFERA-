package com.application.infera.services;

import com.application.infera.enums.ActivityType;
import com.application.infera.models.*;
import com.application.infera.repositories.ActivityRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

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

    // add methods
    public long getTotalActivityCount(User user) {
        return activityRepository.countByUser(user);
    }

    // Category counts: NOTE / WORKSPACE / RESOURCE / TAG — collapses the 3 sub-types per entity into one bucket
    public Map<String, Long> getCategoryBreakdown(User user) {
        List<Activity> all = activityRepository.findByUserOrderByCreatedAtDesc(user);
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("NOTE", 0L);
        counts.put("WORKSPACE", 0L);
        counts.put("RESOURCE", 0L);
        counts.put("TAG", 0L);

        for (Activity a : all) {
            String prefix = a.getType().name().split("_")[0];
            counts.merge(prefix, 1L, Long::sum);
        }
        return counts;
    }

    // Daily counts for the last 30 days, oldest first — powers the monthly trend chart
    public List<Integer> getMonthlyDailyCounts(User user) {
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(29);

        List<Activity> recent = activityRepository.findByUserAndCreatedAtAfterOrderByCreatedAtAsc(
                user, start.atStartOfDay());

        Map<LocalDate, Integer> byDate = new HashMap<>();
        for (Activity a : recent) {
            LocalDate d = a.getCreatedAt().toLocalDate();
            byDate.merge(d, 1, Integer::sum);
        }

        List<Integer> result = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            result.add(byDate.getOrDefault(start.plusDays(i), 0));
        }
        return result;
    }

    private List<LocalDate> getActiveDatesDesc(User user) {
        return activityRepository.findDistinctActiveDates(user)
                .stream().map(java.sql.Date::toLocalDate).collect(Collectors.toList());
    }

    // Consecutive days of activity counting backward from today (or yesterday, if nothing logged yet today)
    public int getCurrentStreak(User user) {
        List<LocalDate> dates = getActiveDatesDesc(user);
        if (dates.isEmpty()) return 0;

        LocalDate today = LocalDate.now();
        LocalDate expected;

        if (dates.get(0).equals(today)) expected = today;
        else if (dates.get(0).equals(today.minusDays(1))) expected = today.minusDays(1);
        else return 0;

        int streak = 0;
        for (LocalDate d : dates) {
            if (d.equals(expected)) {
                streak++;
                expected = expected.minusDays(1);
            } else {
                break;
            }
        }
        return streak;
    }

    // Longest consecutive-day run ever, not just the current one
    public int getLongestStreak(User user) {
        List<LocalDate> dates = getActiveDatesDesc(user);
        if (dates.isEmpty()) return 0;

        List<LocalDate> ascending = new ArrayList<>(dates);
        Collections.reverse(ascending);

        int longest = 1, current = 1;
        for (int i = 1; i < ascending.size(); i++) {
            if (ascending.get(i).equals(ascending.get(i - 1).plusDays(1))) {
                current++;
            } else {
                current = 1;
            }
            longest = Math.max(longest, current);
        }
        return longest;
    }
}