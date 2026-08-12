# Load KEY=VALUE lines into the current shell (dash-safe).
# Usage: . ./scripts/export_env.sh && load_env ./.env.deploy
# Skips comments/blank lines and keeps values that contain spaces.

load_env() {
  file="$1"
  if [ ! -f "$file" ]; then
    echo "ERROR: env file missing: $file"
    return 1
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    line=$(printf '%s' "$line" | tr -d '\r')
    case "$line" in
      ''|\#*) continue ;;
    esac
    case "$line" in
      *=*) ;;
      *) continue ;;
    esac
    key="${line%%=*}"
    val="${line#*=}"
    case "$val" in
      \"*\") val="${val#\"}"; val="${val%\"}" ;;
      \'*\') val="${val#\'}"; val="${val%\'}" ;;
    esac
    export "$key=$val"
  done < "$file"
}
