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

/* Helper function that updates a passed active brew day object. */
var activeBrewingProcesses = [];
async function getActiveBrewingProcesses(ctx) {
  if (activeBrewingProcesses.length == 0) {
    console.log('refreshing active brewing processes list...');
    activeBrewingProcesses = await ctx.db.query.brewingProcesses(
      { where: { active: true } },
      `{
      id,start,end,graphs{id, sensorName, active}
      }`
    );
  } else {
    console.log('using active brewing processes cache...');
  }

  return activeBrewingProcesses;
}

module.exports = {
  hasPermission,
  getActiveBrewingProcesses
};
