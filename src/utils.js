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

/* Helper function that caches active brewing processes. */
var cachedActiveBrewingProcesses = [];
async function activeBrewingProcessesCache(ctx, update) {
  if (cachedActiveBrewingProcesses.length == 0 || update) {
    console.log('refreshing active brewing processes list...');
    cachedActiveBrewingProcesses = await ctx.db.query.brewingProcesses(
      { where: { active: true } },
      `{
      id,start,end,graphs{id, sensorName, active, updateFrequency}
      }`
    );
  } else {
    console.log('using active brewing processes cache...');
  }
  return cachedActiveBrewingProcesses;
}

module.exports = {
  checkUserPermissions,
  activeBrewingProcessesCache
};
