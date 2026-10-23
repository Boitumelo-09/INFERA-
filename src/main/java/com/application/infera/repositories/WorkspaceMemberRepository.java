package com.application.infera.repositories;

import com.application.infera.models.User;
import com.application.infera.models.Workspace;
import com.application.infera.models.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {
    List<WorkspaceMember> findByWorkspace(Workspace workspace);
    List<WorkspaceMember> findByUser(User user);
}