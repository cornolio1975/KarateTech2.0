import { NextResponse } from 'next/server';
import { supabase } from '@/db/dbClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not established' }, { status: 500 });
    }

    // Fetch published and non-deleted tournaments
    // We assume anything not Draft, Deleted, or Archived is 'Upcoming/Active'
    const { data: dbData, error } = await supabase
      .from('tournaments')
      .select(`
        id, 
        name, 
        discipline, 
        poster_emoji, 
        banner_gradient, 
        organizer, 
        date, 
        date_iso, 
        registration_close, 
        registration_close_iso, 
        venue, 
        city, 
        status,
        data
      `)
      .neq('status', 'Draft')
      .neq('status', 'Deleted')
      .neq('status', 'Archived')
      .order('date_iso', { ascending: true });

    if (error) {
      console.error('Error fetching public tournaments:', error);
      return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
    }

    const data = dbData.map(t => {
      const tData = (t.data?.tournament || t.data || {});
      return {
        ...t,
        short_name: tData.short_name,
        banner_url: tData.banner_url,
        end_date_iso: tData.end_date_iso,
        registration_status: tData.registration_status,
        state: tData.state,
        country: tData.country
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
