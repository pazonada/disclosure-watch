import { NextRequest, NextResponse } from "next/server";

interface SubmissionPayload {
  type: string;
  title: string;
  url: string;
  description: string;
  date: string;
  notes: string;
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmissionPayload;

    // Validate required fields
    if (!body.type || !body.title || !body.description) {
      return NextResponse.json(
        { error: "Missing required fields: type, title, and description" },
        { status: 400 }
      );
    }

    // Log submission to console (for now)
    console.log("New submission received:", {
      timestamp: new Date().toISOString(),
      type: body.type,
      title: body.title,
      description: body.description,
      url: body.url || null,
      date: body.date || null,
      notes: body.notes || null,
      email: body.email || null,
    });

    // TODO: Integrate with Supabase to store submissions
    // const { data, error } = await supabase
    //   .from('submissions')
    //   .insert([
    //     {
    //       type: body.type,
    //       title: body.title,
    //       description: body.description,
    //       url: body.url,
    //       date: body.date,
    //       notes: body.notes,
    //       email: body.email,
    //       status: 'pending',
    //       created_at: new Date().toISOString(),
    //     },
    //   ]);
    //
    // if (error) {
    //   console.error('Supabase error:', error);
    //   return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
    // }

    return NextResponse.json(
      {
        success: true,
        message: "Submission received and will be reviewed before publishing",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
