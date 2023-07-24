export type SaveFile = ({
  key,
  data,
}: {
  key: string;
  data: string;
}) => Promise<void>;
