-- Add PT response columns to pt_reviews table
ALTER TABLE public.pt_reviews
ADD COLUMN pt_response TEXT,
ADD COLUMN pt_response_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on reviews with responses
CREATE INDEX idx_pt_reviews_pt_response ON public.pt_reviews (pt_user_id) WHERE pt_response IS NOT NULL;