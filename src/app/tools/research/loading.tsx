import { LoadingState } from "../../../components/states/StatePanel.tsx";

export default function ResearchLoading() {
  return <LoadingState title="Загружаем исследования" description="Получаем только доступные вам проекты и историю запусков." />;
}
