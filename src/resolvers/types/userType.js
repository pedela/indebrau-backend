const jwt = require('jsonwebtoken');

const userType = {
  // no auth neeeded here, since a user can only be
  // accessed by admins and the user herself
  async participatingBrewingProcesses(parent, args, ctx) {
    let { participatingBrewingProcesses } = await ctx.prisma.user.findUnique({
      where: { id: parent.id },
      select: {
        participatingBrewingProcesses: { select: { brewingProcess: {} } }
      }
    });
    // bit of magic to get the processes in an array of the right format...
    let processes = [];
    for (let i = 0; i < participatingBrewingProcesses.length; i++) {
      processes.push(participatingBrewingProcesses[i].brewingProcess);
    }
    return processes;
  },

  async token(parent) {
    return jwt.sign({ userId: parent.id }, process.env.APP_SECRET);
  }
};

module.exports = { userType };
