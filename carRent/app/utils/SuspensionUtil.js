const assertNotSuspended = (user, action) => {
  if (user?.isSuspended) {
    throw new ApiError(403, `Your account is suspended, so you can't ${action}.${user.suspensionReason ? ` Reason: ${user.suspensionReason}` : ''}`);
  }
};

module.exports = { assertNotSuspended };