import { AIServiceConfigDTO } from './ai-services.config.dto';
import { AppConfigDTO } from './app.config.dto';
import { ServiceConfigDTO } from './cloud.config';

export * from './app.config.dto';

type ConfigDTO = AppConfigDTO & AIServiceConfigDTO & ServiceConfigDTO;

export default ConfigDTO;
