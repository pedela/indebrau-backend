const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userMutations = {
  async signup(parent, args, ctx) {
    const password = await bcrypt.hash(args.password, 10);
    const name = args.name;
    const email = args.email;
    const user = await ctx.db.mutation.createUser({
      data: { name, password, email, permissions: { set: 'USER' } }
    });
    let token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    ctx.response.cookie('token', token, {
    //  httpOnly: true,
      //      secure: true, // add in deployment to ensure https
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year cookie
    });
    return {
      ...user,
      token: token
    };
  },

  async signin(parent, { email, password }, ctx) {
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No such user found for email: ${email}`);
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Invalid password');
    }
    let token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    ctx.response.cookie('token', token, {
    //  httpOnly: true,
      //      secure: true, // add in deployment to ensure https
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year cookie
    });
    return {
      ...user,
      token: token
    };
  },

  signout(parent, args, ctx) {
    ctx.response.clearCookie('token');
    return { message: 'Goodbye!' };
  }
};

module.exports = { userMutations };
