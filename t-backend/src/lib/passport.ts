import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { User, IUserDocument } from '../models/User';
import { IUser } from '../types';

interface GoogleName {
  firstName?: string;
  lastName?: string;
}

/** Google splits the display name for us; fall back to it whole when it does not. */
function readGoogleName(profile: GoogleProfile): GoogleName {
  const firstName = profile.name?.givenName?.trim() || profile.displayName?.trim() || undefined;
  const lastName = profile.name?.familyName?.trim() || undefined;
  return { firstName, lastName };
}

/** Returns the first photo URL from the Google profile, or undefined. */
function readGooglePhoto(profile: GoogleProfile): string | undefined {
  return profile.photos?.[0]?.value || undefined;
}

/** Fills in a name only where the account has none, so edits made in-app are never overwritten. */
function applyMissingName(user: IUserDocument, name: GoogleName): boolean {
  let changed = false;
  if (!user.firstName && name.firstName) {
    user.firstName = name.firstName;
    changed = true;
  }
  if (!user.lastName && name.lastName) {
    user.lastName = name.lastName;
    changed = true;
  }
  return changed;
}

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

          const name = readGoogleName(profile);
          const googlePhoto = readGooglePhoto(profile);

          if (user) {
            const linksGoogle = !user.googleId;
            if (linksGoogle) {
              user.googleId = profile.id;
              user.authProvider = 'google';
              user.emailVerified = true;
            }
            const namesFilled = applyMissingName(user, name);
            // Set the Google photo only when the user has no avatar yet
            const avatarFilled = !user.avatarUrl && googlePhoto;
            if (avatarFilled) {
              user.avatarUrl = googlePhoto;
            }
            if (linksGoogle || namesFilled || avatarFilled) {
              await user.save();
            }
          } else {
            // Create new user - Google already verified the email
            user = await User.create({
              email,
              ...name,
              googleId: profile.id,
              authProvider: 'google',
              emailVerified: true,
              avatarUrl: googlePhoto,
            });
          }

          // Convert to plain object with string _id for Express.User compatibility
          const userObj: IUser = {
            _id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
            authProvider: user.authProvider as 'local' | 'google',
            googleId: user.googleId,
            avatarUrl: user.avatarUrl,
            onboardingCompletedAt: user.onboardingCompletedAt,
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
