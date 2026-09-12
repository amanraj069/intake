import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import { IUser } from '../types';

export function configurePassport(): void {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'));
          }

          // Find by googleId first, then fall back to email
          let user = await User.findOne({
            $or: [{ googleId: profile.id }, { email }],
          });

          if (user) {
            // If user exists by email but doesn't have googleId yet, link it
            if (!user.googleId) {
              user.googleId = profile.id;
              user.authProvider = 'google';
              user.emailVerified = true;
              await user.save();
            }
          } else {
            // Create new user - Google already verified the email
            user = await User.create({
              email,
              googleId: profile.id,
              authProvider: 'google',
              emailVerified: true,
            });
          }

          // Convert to plain object with string _id for Express.User compatibility
          const userObj: IUser = {
            _id: user._id.toString(),
            email: user.email,
            emailVerified: user.emailVerified,
            authProvider: user.authProvider as 'local' | 'google',
            googleId: user.googleId,
            createdAt: user.createdAt,
          };

          return done(null, userObj);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  // We don't use Passport sessions (we use JWTs), but Passport requires these
  passport.serializeUser((user, done) => {
    done(null, (user as IUser)._id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id).lean();
      if (user) {
        done(null, { ...user, _id: user._id.toString() } as IUser);
      } else {
        done(null, null);
      }
    } catch (error) {
      done(error);
    }
  });
}
