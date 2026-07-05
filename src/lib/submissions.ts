export type EventSubmission = {
  id: string;
  title: string;
  city: string;
  venue: string;
  organizer: string;
  category: string;
  event_date: string | null;
  end_date: string | null;
  is_multi_day: boolean | null;
  event_time: string | null;
  price: string | null;
  description: string | null;
  image_url: string | null;

  ticket_mode: "none" | "external" | "internal" | null;
  ticket_url: string | null;
  ticket_price: string | null;
  ticket_capacity: number | null;
  ticket_button_label: string | null;
  instagram_url: string | null;

  submitted_by: string | null;
  organizer_id: string | null;
  artists_text: string | null;
  status: string;
  created_at: string;
};