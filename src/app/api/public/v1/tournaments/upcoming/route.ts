import { NextResponse } from 'next/server';
import { supabase } from '@/db/dbClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Database connection not established' } }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Get current time in ISO format for comparison
    const now = new Date().toISOString();

    const { data: dbData, error, count } = await supabase
      .from('tournaments')
      .select(`
        id, 
        name, 
        organizer, 
        date_iso, 
        venue, 
        city, 
        registration_close_iso, 
        status,
        poster_emoji,
        banner_gradient,
        created_at
      `, { count: 'exact' })
      .eq('status', 'Published')
      .gt('date_iso', now)
      .order('date_iso', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching public upcoming tournaments:', error);
      return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tournaments' } }, { status: 500 });
    }

    const tournaments = dbData.map(t => {
      const isRegistrationClosed = t.registration_close_iso ? new Date(now) > new Date(t.registration_close_iso) : false;
      const registrationStatus = isRegistrationClosed ? 'Closed' : 'Open';
      
      const dateObj = new Date(t.date_iso);
      const tournamentDate = dateObj.toISOString().split('T')[0];
      const startTime = dateObj.toISOString().split('T')[1].split('.')[0];
      
      return {
        tournamentId: t.id,
        tournamentName: t.name,
        organizer: t.organizer,
        tournamentDate: tournamentDate,
        startTime: startTime,
        timezone: "Asia/Kuala_Lumpur",
        venue: t.venue,
        state: t.city,
        registrationClosingDate: t.registration_close_iso,
        status: t.status,
        registrationStatus: registrationStatus,
        registration: {
          available: !isRegistrationClosed,
          url: `/registration?tournament_id=${t.id}`
        },
        logoUrl: null, // Mapped from poster_emoji if needed, but spec says URL
        bannerUrl: null, // Mapped from banner_gradient if needed
        lastUpdatedAt: t.created_at
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        tournaments
      },
      meta: {
        count: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } }, { status: 500 });
  }
}
