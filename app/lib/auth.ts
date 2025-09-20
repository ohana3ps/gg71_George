
import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  useSecureCookies: false, // Force non-secure for testing
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: false,
        domain: undefined
      }
    }
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              isAdmin: true,
              role: true,
              permissions: true,
              forcePasswordChange: true
            }
          })

          if (!user) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
            role: user.role,
            permissions: user.permissions,
            forcePasswordChange: user.forcePasswordChange
          }
        } catch (error) {
          console.error('Authorization error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }: { token: any; user?: any; account?: any }) {
      try {
        if (user) {
          token.id = user.id
          token.isAdmin = user.isAdmin
          token.role = user.role
          token.permissions = user.permissions
          token.forcePasswordChange = user.forcePasswordChange
          
          // Debug logging in development
          if (process.env.NODE_ENV === 'development') {
            console.log('JWT token created for user:', {
              id: user.id,
              email: user.email,
              role: user.role
            })
          }
        }
        return token
      } catch (error) {
        console.error('JWT callback error:', error)
        return token
      }
    },
    async session({ session, token }: { session: any; token: any }) {
      try {
        if (token && session.user) {
          session.user.id = token.id || token.sub
          session.user.isAdmin = token.isAdmin || false
          session.user.role = token.role || 'user'
          session.user.permissions = token.permissions || null
          session.user.forcePasswordChange = token.forcePasswordChange || false
          
          // Debug logging in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Session established for user:', {
              id: session.user.id,
              email: session.user.email,
              role: session.user.role
            })
          }
        }
        return session
      } catch (error) {
        console.error('Session callback error:', error)
        return session
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // Redirect to sign-in on auth errors
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-testing',
  debug: false, // Disabled to reduce noise during testing
  events: {
    async signOut() {
      // Clear any client-side data on sign out
      console.log('User signed out')
    },
    async session({ session }) {
      // Log session events in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Session accessed:', { userId: session.user?.id })
      }
    }
  },
}
