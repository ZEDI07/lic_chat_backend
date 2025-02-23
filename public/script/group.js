function updateGroupUserStatus(id, status, refreshFunction, user) {
  const message =
    status == 0
      ? "User is successfully deactivated from the group"
      : status == 1
        ? "User is successfully added to group."
        : "User is successfully removed from the group";
  $.ajax({
    type: "POST",
    url: "/update-group-user-status",
    data: { id: id, user: user, status: status },
    success: () => {
      toastNotification("success", message);
      refreshFunction && refreshFunction(user);
    },
    error: (error) => {
      toastNotification("danger", error.responseJSON.message);
    },
  });
}
