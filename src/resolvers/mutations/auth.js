const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const auth = {
  
  async signup(parent, args, ctx) {
    const password = await bcrypt.hash(args.password, 10);
    const name = args.name;
    const email = args.email;
    const valid = args.registrationSecret.localeCompare(process.env.APP_SECRET);
    if (valid != 0) {
      throw new Error('or no registration secret');
    }
    const user = await ctx.db.mutation.createUser({
      data: { name, password, email }
    });
    return {
      token: jwt.sign({ userId: user.id }, process.env.APP_SECRET)
    };
  },

  async login(parent, { email, password }, ctx) {
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
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year cookie
    });
    return {
      token: token,
      user
    };
  }
};

module.exports = { auth };
