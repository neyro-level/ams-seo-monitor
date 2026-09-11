import { ImpulseLanding } from "../components/marketing/ImpulseLanding.tsx";
import { isMcpOAuthLoginRequest } from "../platform/auth/mcp-config.ts";

type HomeSearchParams = Record<string, string | string[] | undefined>;

export default async function HomePage({ searchParams }: { searchParams: Promise<HomeSearchParams> }) {
  const params = await searchParams;
  const oauthLoginRequested = isMcpOAuthLoginRequest(params);

  return (
    <ImpulseLanding
      loginRequested={params.login === "1" || oauthLoginRequested}
      oauthLoginRequested={oauthLoginRequested}
    />
  );
}
