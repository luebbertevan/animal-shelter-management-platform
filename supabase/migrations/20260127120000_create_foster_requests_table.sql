-- Create foster_requests table for tracking foster request workflow
CREATE TABLE foster_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    foster_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    animal_id UUID REFERENCES animals(id) ON DELETE CASCADE,
    group_id UUID REFERENCES animal_groups(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
    previous_foster_visibility TEXT NOT NULL CHECK (previous_foster_visibility IN ('available_now', 'available_future', 'foster_pending', 'not_visible')),
    message TEXT,
    coordinator_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id),
    CONSTRAINT foster_requests_animal_or_group CHECK (
        (animal_id IS NOT NULL AND group_id IS NULL) OR
        (animal_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Enable RLS
ALTER TABLE foster_requests ENABLE ROW LEVEL SECURITY;

-- Indexes for query performance
CREATE INDEX idx_foster_requests_organization ON foster_requests(organization_id);
CREATE INDEX idx_foster_requests_foster ON foster_requests(foster_profile_id);
CREATE INDEX idx_foster_requests_animal ON foster_requests(animal_id) WHERE animal_id IS NOT NULL;
CREATE INDEX idx_foster_requests_group ON foster_requests(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_foster_requests_status ON foster_requests(status);

-- Partial unique index: only one pending request per foster per animal/group
CREATE UNIQUE INDEX idx_foster_requests_unique_pending_animal
    ON foster_requests(organization_id, foster_profile_id, animal_id)
    WHERE status = 'pending' AND animal_id IS NOT NULL;

CREATE UNIQUE INDEX idx_foster_requests_unique_pending_group
    ON foster_requests(organization_id, foster_profile_id, group_id)
    WHERE status = 'pending' AND group_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_foster_requests_updated_at
    BEFORE UPDATE ON foster_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- Coordinators can see all requests in their organization
CREATE POLICY "Coordinators can view all requests in organization"
    ON foster_requests FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'coordinator'
        )
    );

-- Fosters can view their own requests
CREATE POLICY "Fosters can view their own requests"
    ON foster_requests FOR SELECT
    USING (
        foster_profile_id = auth.uid()
        AND organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Coordinators can create requests (for testing/admin purposes)
CREATE POLICY "Coordinators can create requests"
    ON foster_requests FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'coordinator'
        )
    );

-- Fosters can create their own requests
CREATE POLICY "Fosters can create their own requests"
    ON foster_requests FOR INSERT
    WITH CHECK (
        foster_profile_id = auth.uid()
        AND organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Coordinators can update requests (approve/deny)
CREATE POLICY "Coordinators can update requests"
    ON foster_requests FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'coordinator'
        )
    );

-- Fosters can update their own pending requests (cancel only)
CREATE POLICY "Fosters can cancel their own requests"
    ON foster_requests FOR UPDATE
    USING (
        foster_profile_id = auth.uid()
        AND status = 'pending'
        AND organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        status = 'cancelled'
    );

