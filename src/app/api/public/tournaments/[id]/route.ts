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
      return NextResponse.json({ error: 'Database connection not established' }, { status: 500 });
    }

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
        pdf_url,
        data
      `)
      .eq('id', id)
      .neq('status', 'Draft')
      .neq('status', 'Deleted')
      .single();

    if (error) {
      console.error(`Error fetching tournament ${id}:`, error);
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tData = (dbData.data?.tournament || dbData.data || {});
    const data = {
      ...tData,
      ...dbData,
      data: undefined
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
