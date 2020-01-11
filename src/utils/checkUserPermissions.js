/* Authorizes users, permissions may be undefined for any permissions acceptable */
function checkUserPermissions(
  ctx,
  permissionsNeeded,
  brewingProcessId,
  graphId
) {
  if (!ctx.request.user) {
    throw new Error('You must be logged in to do that!');
  }
  if (!permissionsNeeded) return;
  const matchedPermissions = ctx.request.user.permissions.filter(
    permissionTheyHave => permissionsNeeded.includes(permissionTheyHave)
  );

  // not the needed user role
  if (!matchedPermissions.length) {
    throw new Error(
      `You do not have sufficient permissions: ${permissionsNeeded}, You Have: ${
        ctx.request.user.permissions
      }`
    );
  }

  // user tries to access brewing process, check if she participates
  if (brewingProcessId && !ctx.request.user.permissions.includes('ADMIN')) {
    let found = false;
    ctx.request.user.participatingBrewingProcesses.map(brewingProcess => {
      if (brewingProcess.id == brewingProcessId) {
        // user has permission
        found = true;
      }
    });
    // no permission
    if (!found) {
      throw new Error(
        `You do not have the right to access brewing process: ${brewingProcessId}`
      );
    }
  }
  // user tries to access graph, check if she participates
  if (graphId && !ctx.request.user.permissions.includes('ADMIN')) {
    let found = false;
    ctx.request.user.participatingBrewingProcesses.map(brewingProcess => {
      brewingProcess.graphs.map(graph => {
        if (graph.id == graphId) {
          // user has permission
          found = true;
        }
      });
    });
    // no permission
    if (!found) {
      throw new Error(`You do not have the right to access graph: ${graphId}`);
    }
  }
}

module.exports = {
  checkUserPermissions
};
