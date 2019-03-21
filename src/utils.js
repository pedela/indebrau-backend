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

/* Helper function that caches active graphs (to speed up inserts). */
var cachedActiveGraphs = [];
async function activeGraphCache(ctx, update) {
  if (cachedActiveGraphs.length == 0 || update) {
    console.log('refreshing active graph list...');
    cachedActiveGraphs = await ctx.db.query.graphs(
      { where: { active: true } },
      `{
      id, sensorName, active, updateFrequency
      }`
    );
  } else {
    console.log('using active graph cache...');
  }
  return cachedActiveGraphs;
}

module.exports = {
  checkUserPermissions,
  activeGraphCache
};
