const { AuthenticationError } = require('apollo-server-express');

/* Authorizes users, permissions may be undefined for any permissions acceptable */
function checkUserPermissions(ctx, permissionsNeeded, brewingProcessId, graphId) {
  if (!ctx.req || !ctx.req.user) {
    throw new AuthenticationError('You must be logged in to do that!');
  }
  if (!permissionsNeeded) return;
  const matchedPermissions = ctx.req.user.permissions.filter(
    (permissionTheyHave) => permissionsNeeded.includes(permissionTheyHave)
  );

  // not the needed user role
  if (!matchedPermissions.length) {
    throw new Error(
      `You do not have sufficient permissions: ${permissionsNeeded}, You Have: ${ctx.req.user.permissions}`
    );
  }

  // user tries to access brewing process, check if she participates
  if (brewingProcessId && !ctx.req.user.permissions.includes('ADMIN')) {
    let found = false;
    ctx.req.user.participatingBrewingProcesses.map((process) => {
      if (process.brewingProcess.id == brewingProcessId) {
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
  if (graphId && !ctx.req.user.permissions.includes('ADMIN')) {
    let found = false;
    ctx.req.user.participatingBrewingProcesses.map((process) => {
      process.brewingProcess.graphs.map((graph) => {
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
