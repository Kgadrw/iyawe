'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react'
import { apiRequest, API_ENDPOINTS } from '@/lib/api'

export default function MatchesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    try {
      // Fetch lost and found reports to get matches
      const [lostRes, foundRes] = await Promise.all([
        apiRequest(API_ENDPOINTS.lostReports),
        apiRequest(API_ENDPOINTS.foundReports),
      ])

      const allMatches: any[] = []

      if (lostRes.ok) {
        const lostData = await lostRes.json()
        lostData.reports?.forEach((report: any) => {
          report.matches?.forEach((match: any) => {
            allMatches.push({
              ...match,
              reportType: 'lost',
              myReport: report,
            })
          })
        })
      }

      if (foundRes.ok) {
        const foundData = await foundRes.json()
        foundData.reports?.forEach((report: any) => {
          report.matches?.forEach((match: any) => {
            allMatches.push({
              ...match,
              reportType: 'found',
              myReport: report,
            })
          })
        })
      }

      setMatches(allMatches)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load matches',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVerification = async (matchId: string) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.matchVerify(matchId), {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create verification',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Success',
        description: `Verification code: ${data.verification.verificationCode}. Share this with the other party to verify ownership.`,
      })

      fetchMatches()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading matches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Document Matches</h1>
          <p className="text-gray-600">View and manage your document matches</p>
        </div>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 text-lg">No matches found yet</p>
              <p className="text-gray-400 text-sm mt-2">
                When your missing or recovered report matches with another report, it will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <Card key={match.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="mb-2">
                        {match.reportType === 'lost' ? 'Recovered Match' : 'Missing Match'}
                      </CardTitle>
                      <CardDescription>
                        Match Confidence: {Math.round(match.confidence * 100)}%
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {match.status === 'VERIFIED' && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {match.status === 'PENDING' && (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      )}
                      <span className={`px-2 py-1 rounded text-sm ${
                        match.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                        match.status === 'MATCHED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {match.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Your Report:</h4>
                      <p className="text-sm text-gray-600">
                        Type: {match.myReport.documentType}
                      </p>
                      {match.myReport.lostDate && (
                        <p className="text-sm text-gray-600">
                          Missing: {new Date(match.myReport.lostDate).toLocaleDateString()}
                        </p>
                      )}
                      {match.myReport.foundDate && (
                        <p className="text-sm text-gray-600">
                          Recovered: {new Date(match.myReport.foundDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Matched Report:</h4>
                      <p className="text-sm text-gray-600">
                        Type: {match.reportType === 'lost' 
                          ? match.foundReport?.documentType 
                          : match.lostReport?.documentType}
                      </p>
                      {match.reportType === 'lost' && match.foundReport?.foundDate && (
                        <p className="text-sm text-gray-600">
                          Recovered: {new Date(match.foundReport.foundDate).toLocaleDateString()}
                        </p>
                      )}
                      {match.reportType === 'found' && match.lostReport?.lostDate && (
                        <p className="text-sm text-gray-600">
                          Missing: {new Date(match.lostReport.lostDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {match.status === 'PENDING' && (
                      <Button
                        onClick={() => handleCreateVerification(match.id)}
                        className="w-full"
                      >
                        Start Verification Process
                      </Button>
                    )}

                    {match.status === 'VERIFIED' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800">
                          ✓ Ownership verified! Contact the other party to arrange handover at a safe location.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

