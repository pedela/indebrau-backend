function hasPermission(user, permissionsNeeded) {
  const matchedPermissions = user.permissions.filter(permissionTheyHave =>
    permissionsNeeded.includes(permissionTheyHave)
  );
  if (!matchedPermissions.length) {
    throw new Error(
      `You do not have sufficient permissions: ${permissionsNeeded}, You Have: ${
        user.permissions
      }`
    );
  }
}

/* Helper function that updates a passed active brewdays object. */
async function getActiveBrewDays(ctx, activeBrewDays) {
  if (activeBrewDays.length == 0) {
    activeBrewDays = await ctx.db.query.brewdays(
      { where: { active: true } },
      `{
      id,start,end,graphs{id}
      }`
    );
  }
  return activeBrewDays;
}

module.exports = {
  hasPermission,
  getActiveBrewDays
};
