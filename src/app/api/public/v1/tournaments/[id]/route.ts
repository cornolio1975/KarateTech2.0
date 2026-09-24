import { NextResponse } from 'next/server';
import { supabase } from '@/db/dbClient';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!supabase) {
      return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Database connection not established' } }, { status: 500 });
    }

    const { data: t, error } = await supabase
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
      `)
      .eq('id', id)
      .neq('status', 'Draft')
      .neq('status', 'Deleted')
      .neq('status', 'Archived')
      .single();

    if (error || !t) {
      // Intentionally using TOURNAMENT_NOT_FOUND for draft/private tournaments as well
      return NextResponse.json({ success: false, error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found' } }, { status: 404 });
    }

    const now = new Date().toISOString();
    const isRegistrationClosed = t.registration_close_iso ? new Date(now) > new Date(t.registration_close_iso) : false;
    const registrationStatus = isRegistrationClosed ? 'Closed' : 'Open';
    
    const dateObj = new Date(t.date_iso);
    const tournamentDate = dateObj.toISOString().split('T')[0];
    const startTime = dateObj.toISOString().split('T')[1].split('.')[0];
    
    const tournamentData = {
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
        available: !isRegistrationClosed && t.status !== 'Cancelled',
        url: `/registration?tournament_id=${t.id}`
      },
      logoUrl: null,
      bannerUrl: null,
      lastUpdatedAt: t.created_at
    };

    return NextResponse.json({
      success: true,
      data: tournamentData
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } }, { status: 500 });
  }
}
