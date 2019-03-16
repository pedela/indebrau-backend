/* Authorizes users, permissions may be undefined for any permissions acceptable */
function checkUserPermissions(ctx, permissionsNeeded) {
  if (!ctx.request.user) {
    throw new Error('You must be logged in to do that!');
  }
  if (!permissionsNeeded) return;
  const matchedPermissions = ctx.request.user.permissions.filter(
    permissionTheyHave => permissionsNeeded.includes(permissionTheyHave)
  );
  if (!matchedPermissions.length) {
    throw new Error(
      `You do not have sufficient permissions: ${permissionsNeeded}, You Have: ${
        ctx.request.user.permissions
      }`
    );
  }
}

/* Helper function that updates a passed active brewing process object. */
var activeBrewingProcesses = [];
async function getActiveBrewingProcesses(ctx) {
  if (activeBrewingProcesses.length == 0) {
    console.log('refreshing active brewing processes list...');
    activeBrewingProcesses = await ctx.db.query.brewingProcesses(
      { where: { active: true } },
      `{
      id,start,end,graphs{id, sensorName, active, updateFrequency}
      }`
    );
  } else {
    console.log('using active brewing processes cache...');
  }

  return activeBrewingProcesses;
}

module.exports = {
  checkUserPermissions,
  getActiveBrewingProcesses
};
