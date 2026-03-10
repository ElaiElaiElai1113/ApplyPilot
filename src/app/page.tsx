'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  FileText,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Target,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: FileText,
    title: 'Resume Vault',
    description: 'Store and manage multiple versions of your resume for different roles and industries.',
  },
  {
    icon: Sparkles,
    title: 'AI Generation',
    description: 'Generate tailored cover letters, optimized resumes, and interview questions in seconds.',
  },
  {
    icon: BarChart3,
    title: 'Match Scores',
    description: 'See how well your resume matches job requirements with intelligent scoring.',
  },
  {
    icon: Target,
    title: 'Interview Prep',
    description: 'Get personalized interview questions based on the job description.',
  },
  {
    icon: Zap,
    title: 'Quick Apply',
    description: 'Apply to jobs 10x faster with AI-generated application packages.',
  },
  {
    icon: CheckCircle2,
    title: 'Track Progress',
    description: 'Monitor all your applications and track your progress in one dashboard.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Upload Your Resume',
    description: 'Paste your master resume into the vault. We\'ll store it securely for future use.',
  },
  {
    number: '02',
    title: 'Enter Job Details',
    description: 'Input the company name, role, and job description for the position you\'re interested in.',
  },
  {
    number: '03',
    title: 'Get AI Generated Package',
    description: 'Receive a tailored cover letter, optimized resume, match score, and interview prep.',
  },
  {
    number: '04',
    title: 'Apply & Track',
    description: 'Use the generated content to apply and track your application status.',
  },
]

export default function HomePage() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -20 }}
            animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ApplyPilot
            </span>
          </motion.div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 20 }}
            animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/pricing">
              <Button>Get Started Free</Button>
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <motion.div
            initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
            animate={reduceMotion ? {} : { scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6"
          >
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Powered by advanced AI workflow automation</span>
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Apply to Jobs{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              10x Faster
            </span>
            <br />with AI
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your AI-powered copilot for resumes, cover letters, and interview preparation.
            Land your dream job with intelligent, personalized application packages.
          </p>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/pricing">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/#how-it-works">
              <Button size="lg" variant="outline" className="text-lg px-8">
                See How It Works
              </Button>
            </Link>
          </motion.div>
        </motion.div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left md:grid-cols-3">
          <Card className="bg-card/70">
            <CardContent className="flex items-start gap-3 p-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Structured workflow</p>
                <p className="text-sm text-muted-foreground">Resume vault, generation flow, and tracker in one product.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/70">
            <CardContent className="flex items-start gap-3 p-5">
              <BarChart3 className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Match visibility</p>
                <p className="text-sm text-muted-foreground">See score gaps and missing keywords before you apply.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/70">
            <CardContent className="flex items-start gap-3 p-5">
              <FileText className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Human-editable output</p>
                <p className="text-sm text-muted-foreground">Copy, refine, and save every generated package for your next step.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold mb-4">Everything You Need to Apply Smarter</h2>
          <p className="text-xl text-muted-foreground">
            Powerful features to help you land your dream job
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-20 bg-muted/50 rounded-3xl my-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground">
            Four simple steps to your next job offer
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative"
            >
              <div className="bg-primary text-primary-foreground text-4xl font-bold w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-primary to-secondary rounded-3xl p-12 md:p-20 text-white"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Ready to Land Your Dream Job?
          </h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Start with a free plan, validate the workflow, and upgrade when you need more AI generation capacity.
          </p>
          <Link href="/pricing">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              View Pricing
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ApplyPilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
