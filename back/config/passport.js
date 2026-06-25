const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const { query: db } = require("./db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // Check existing user
        let existingUser = await db(
          `SELECT * FROM wabyone_users WHERE email = $1`,
          [email],
        );

        let user;
        let org;

        // USER EXISTS
        if (existingUser.rows.length > 0) {
          user = existingUser.rows[0];

          const orgResult = await db(
            `SELECT om.org_id, om.role, o.name, o.slug
             FROM wabyone_org_members om
             JOIN wabyone_organizations o ON om.org_id = o.id
             WHERE om.user_id = $1
             LIMIT 1`,
            [user.id],
          );

          org = orgResult.rows[0];
        }

        // NEW USER
        else {
          // Create user
          const userResult = await db(
            `INSERT INTO wabyone_users
            (email, first_name, last_name, avatar_url)
            VALUES ($1,$2,$3,$4)
            RETURNING *`,
            [
              email,
              profile.name.givenName,
              profile.name.familyName,
              profile.photos[0]?.value || null,
            ],
          );

          user = userResult.rows[0];

          // Create organization
          const orgName = `${profile.name.givenName}'s Organization`;

          const orgResult = await db(
            `INSERT INTO wabyone_organizations
            (name, slug, email, theme_config)
            VALUES ($1,$2,$3,$4)
            RETURNING *`,
            [
              orgName,
              `org-${Date.now()}`,
              email,
              JSON.stringify({
                primaryColor: "#6366f1",
                secondaryColor: "#8b5cf6",
                accentColor: "#06b6d4",
                sidebarColor: "#1e1b4b",
                theme: "indigo",
              }),
            ],
          );

          org = orgResult.rows[0];

          // Add membership
          await db(
            `INSERT INTO wabyone_org_members
            (user_id, org_id, role, permissions)
            VALUES ($1,$2,'owner',$3)`,
            [user.id, org.id, JSON.stringify(["all"])],
          );
        }

        // Generate JWT
        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            orgId: org.org_id || org.id,
            role: org.role || "owner",
          },
          process.env.JWT_SECRET,
          { expiresIn: "7d" },
        );

        return done(null, {
          token,
        });
      } catch (err) {
        console.error(err);
        return done(err, null);
      }
    },
  ),
);

module.exports = passport;