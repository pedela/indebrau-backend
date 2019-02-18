const { getUserId } = require('../../utils');

const graphMutations = {
  async addData(parent, args, ctx) {
    getUserId(ctx);
    const sensorDataInput = args.sensorData;
    // get active graph with matching sensor name
    // (should be the one we are filling with data..)
    const getActiveGraphList = await ctx.db.query.graphs(
      {
        where: { active: true, sensorName: sensorDataInput.sensorName }
      },
      `{
      id
      }`
    );
    let activeGraphId = getActiveGraphList[0].id;
    // check if graph was found
    if (activeGraphId === null) {
      throw new Error(
        'did not find active graph for sensor ' + sensorDataInput.sensorName
      );
    }

    const data = await ctx.db.mutation.createGraphData({
      data: {
        time: sensorDataInput.sensorTimeStamp,
        value: sensorDataInput.sensorValue,
        graph: {
          connect: {
            id: activeGraphId
          }
        }
      }
    });
    if (!data) {
      throw new Error('problem storing graph data');
    }
    return data;
  },

  async addGraph(parent, args, ctx) {
    getUserId(ctx);
    let startDateTime;
    if (typeof args.startDateTime !== 'undefined') {
      // TODO check if startDateTime is in the past
      startDateTime = args.startDateTime;
    } else {
      startDateTime = new Date().toJSON();
    }
    // search for previous active graph for this sensor
    // and update if exists
    await ctx.db.mutation.updateManyGraphs({
      where: { active: true, sensorName: args.sensorName },
      data: { active: false }
    });
    // create new graph
    const graph = await ctx.db.mutation.createGraph({
      data: {
        name: args.name,
        sensorName: args.sensorName,
        startDateTime: startDateTime,
        active: true
      }
    });
    if (!graph) {
      throw new Error('problem storing graph');
    }
    return {
      id: graph.id
    };
  }
};

module.exports = { graphMutations };
