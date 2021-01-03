const {
  activeGraphCache,
  activeMediaStreamsCache,
} = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { deleteMediaFolder } = require('../../utils/mediaFileHandling');

const brewingProcessMutations = {
  async createBrewingProcess(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    let input = {
      name: args.name,
      description: args.description,
    };
    // start with active preparing step  (if startNow is true)
    if (args.startNow) {
      input.start = new Date().toJSON();
      input.brewingSteps = {
        create: [{ name: 'PREPARING', start: input.start }],
      };
    } else {
      input.brewingSteps = {
        create: [{ name: 'PREPARING' }],
      };
    }
    input.brewingSteps.create.push(
      { name: 'BREWING' },
      { name: 'FERMENTING' },
      { name: 'CONDITIONING' },
      { name: 'BOTTLING' }
    );
    return await ctx.prisma.brewingProcess.create({
      data: { ...input },
    });
  },

  async advanceBrewingProcess(parent, { brewingProcessId }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(brewingProcessId) };
    //we only need the steps here
    let brewingProcess = await ctx.prisma.brewingProcess.findUnique({
      where,
      select: { end: true, brewingSteps: {} },
    });
    if (!brewingProcess) {
      throw new Error(
        `Cannot find brewing process with id ${brewingProcessId}`
      );
    } else if (brewingProcess.end) {
      throw new Error(
        `Brewing process with id ${brewingProcessId} has already ended!`
      );
    }
    let data = {};
    let now = new Date().toJSON();
    for (let i = 0; i < brewingProcess.brewingSteps.length; i++) {
      const brewingStep = brewingProcess.brewingSteps[i];
      // advance process
      switch (brewingStep.name) {
      case 'PREPARING': {
        if (brewingStep.start == null) {
          data.start = now;
          data.brewingSteps = {
            updateMany: {
              data: { start: now },
              where: { name: 'PREPARING' },
            },
          };
        } else if (brewingStep.end == null) {
          data.brewingSteps = {
            updateMany: [
              {
                data: { end: now },
                where: { name: 'PREPARING' },
              },
              {
                data: { start: now },
                where: { name: 'BREWING' },
              },
            ],
          };
        }
        break;
      }
      case 'BREWING': {
        if (!brewingStep.end && brewingStep.start) {
          data.brewingSteps = {
            updateMany: [
              {
                data: { end: now },
                where: { name: 'BREWING' },
              },
              {
                data: { start: now },
                where: { name: 'FERMENTING' },
              },
            ],
          };
        }
        break;
      }
      case 'FERMENTING': {
        if (!brewingStep.end && brewingStep.start) {
          data.brewingSteps = {
            updateMany: [
              {
                data: { end: now },
                where: { name: 'FERMENTING' },
              },
              {
                data: { start: now },
                where: { name: 'CONDITIONING' },
              },
            ],
          };
        }
        break;
      }
      case 'CONDITIONING': {
        if (!brewingStep.end && brewingStep.start) {
          data.brewingSteps = {
            updateMany: [
              {
                data: { end: now },
                where: { name: 'CONDITIONING' },
              },
              {
                data: { start: now },
                where: { name: 'BOTTLING' },
              },
            ],
          };
        }
        break;
      }
      case 'BOTTLING': {
        if (!brewingStep.end && brewingStep.start) {
          data.brewingSteps = {
            updateMany: {
              data: { end: now },
              where: { name: 'BOTTLING' },
            },
          };
          data.end = now;
        }
        break;
      }
      }
      // we got our update, no need to continue
      if (data.brewingSteps) {
        break;
      }
    }
    const updatedBrewingProcess = await ctx.prisma.brewingProcess.update({
      where,
      data,
    });
    // graphs and media streams could become inactive through this action..
    await activeGraphCache(ctx, true);
    await activeMediaStreamsCache(ctx, true);
    return updatedBrewingProcess;
  },

  async changeBottlesAvailable(
    parent,
    { brewingProcessId, bottlesAvailable },
    ctx
  ) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(brewingProcessId) };
    const data = { bottlesAvailable: bottlesAvailable };

    let brewingProcess = await ctx.prisma.brewingProcess.findUnique({ where });
    if (!brewingProcess) {
      throw new Error(`Cannot find brewing process with id ${brewingProcessId}`);
    }
    if (!brewingProcess.end) {
      throw new Error(`Brewing process with id${brewingProcessId} not ended yet!`);
    }
    return await ctx.prisma.brewingProcess.update({ where, data });
  },

  async addUsersToBrewingProcess(parent, { brewingProcessId, userIds }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(brewingProcessId) };

    let brewingProcess = await ctx.prisma.brewingProcess.findUnique({
      where,
      select: { id: true, participatingUsers: { select: { userId: true } } },
    });
    if (!brewingProcess) {
      throw new Error(`Cannot find brewing process with id ${brewingProcessId}`);
    }
    let data = { participatingUsers: { create: [] } };
    let participatingUsers = brewingProcess.participatingUsers;
    userIds.map((userId) => {
      participatingUsers.map((user) => {
        if (user.userId == parseInt(userId)) {
          throw new Error(`User with id ${userId} is already participating!`);
        }
      });
      data.participatingUsers.create.push({
        user: { connect: { id: parseInt(userId) } },
      });
    });
    for (let userId of userIds) {
      let user = await ctx.prisma.user.findUnique({
        where: { id: parseInt(userId) },
      });
      if (!user) {
        throw new Error(`Cannot find user with id ${userId}`);
      }
    }
    return await ctx.prisma.brewingProcess.update({ where, data });
  },

  async deleteBrewingProcess(parent, { brewingProcessId }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // delete and return steps to delete folders afterwards
    const { brewingSteps } = await ctx.prisma.brewingProcess.delete({
      where: { id: parseInt(brewingProcessId) },
      select: { brewingSteps: {} },
    });
    // update caches (associated graphs and streams are deleted cascadingly)
    await activeGraphCache(ctx, true);
    await activeMediaStreamsCache(ctx, true);
    // finally, remove media from disk
    for (let i = 0; i < brewingSteps.length; i++) {
      try {
        await deleteMediaFolder(brewingSteps[i].id);
      } catch (e) {
        throw new Error(
          `Problems deleting media folders for brewing process ${brewingProcessId}`
        );
      }
    }
    return { message: 'Deleted!' };
  },
};

module.exports = { brewingProcessMutations };
