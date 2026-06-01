-- Trigger for clients
CREATE OR REPLACE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for calls
CREATE OR REPLACE TRIGGER update_calls_updated_at
BEFORE UPDATE ON calls
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for receptionist_settings
CREATE OR REPLACE TRIGGER update_receptionist_settings_updated_at
BEFORE UPDATE ON receptionist_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
