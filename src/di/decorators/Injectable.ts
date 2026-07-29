import { container } from "../di-container";

export function Injectable(): ClassDecorator {
	return (target) => {
		container.register(target as any);
	};
}
